package handlers

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, spaceHandler *SpaceHandler) {
	hello := NewHelloHandler()
	hello.Register(router)

	spaceHandler.Register(router)
}
