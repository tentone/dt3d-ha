package handlers

import "github.com/gin-gonic/gin"

func RegisterRoutes(router *gin.Engine, spaceHandler *SpaceHandler) {
	hello := NewHelloHandler()
	hello.Register(router)

	spaceHandler.Register(router)
}
